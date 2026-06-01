import {ColorDef, DisplayStyleSettingsProps, QueryRowFormat } from "@itwin/core-common";
import { IModelConnection, ScreenViewport } from "@itwin/core-frontend";
  
export class Visualization {
    public static getCategoryIds = async (iModel: IModelConnection): Promise<string[]> => {
        const categoriesToHide = [
            "'Wall 2nd'", "'Wall 1st'", "'Dry Wall 2nd'", "'Dry Wall 1st'",
            "'Brick Exterior'", "'WINDOWS 1ST'", "'WINDOWS 2ND'", 
            "'Ceiling 1st'", "'Ceiling 2nd'", "'Callouts'", "'light fixture'", "'Roof'",
        ];

        const query = `SELECT ECInstanceId
                        FROM Bis.SpatialCategory 
                        WHERE CodeValue IN (${categoriesToHide.toString()})`;

        const results = iModel.createQueryReader(query, undefined, {
            rowFormat: QueryRowFormat.UseJsPropertyNames,
        });
        
        const rows = await results.toArray();
        
        // FIX: Added the closing }); for the map function
        return rows.map((row: any) => {
            // Check every possible property name casing that iTwin uses
            return row.id || row.ecInstanceId || row.ECInstanceId || null;
        }); 
    };

    public static toggleHouseExterior = async (viewport: ScreenViewport, show: boolean) => {
    const categoryIds = await Visualization.getCategoryIds(viewport.iModel);
    viewport.changeCategoryDisplay(categoryIds, show);    // show / hide house exterior.
    }

        // Method for changing view background color. 
    public static changeBackground = (viewport: ScreenViewport, bgColor: string) => {
        const displayStyleProps: DisplayStyleSettingsProps = {
            backgroundColor: ColorDef.fromString(bgColor).tbgr
        }
        viewport.overrideDisplayStyle(displayStyleProps);
    }
}
