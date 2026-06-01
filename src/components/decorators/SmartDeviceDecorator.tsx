import { IModelDataApi, SmartDevice } from "../apis/IModelDataApi";
import { XAndY, XYAndZ } from "@itwin/core-geometry";
import { DeviceData, DeviceStatusApi } from "../apis/DeviceStatusApi";
import { QueryRowFormat } from "@itwin/core-common";
import { DecorateContext, Decorator, IModelConnection, Marker, ScreenViewport } from "@itwin/core-frontend";
import { SmartDeviceMarker } from "../markers/SmartDeviceMarker";
import { SmartDeviceAPI } from "../../SmartDeviceAPI";
import { UiFramework } from "@itwin/appui-react";

export class SmartDeviceDecorator implements Decorator {
    private _iModel: IModelConnection;
    private _markers: Marker[];

    constructor(vp: ScreenViewport) {
        this._iModel = vp.iModel;
        this._markers = [];
        this.addMarkers();
    }

    public static async getSmartDeviceData() {
        const query = `
        SELECT SmartDeviceId,
                SmartDeviceType,
                ECInstanceId,
                Origin
                FROM DgnCustomItemTypes_HouseSchema.SmartDevice
                WHERE Origin IS NOT NULL
        `
        const iModel = UiFramework.getIModelConnection()!;
        const reader = iModel.createQueryReader(query);
        const results = [];
        for await (const row of reader) {
        results.push(row);
        }
        console.log(results);
        return results;
    }

    private async addMarkers() {
        //const devices: SmartDevice[] = await IModelDataApi.getSmartDevices();
        const devices: SmartDevice[] = await IModelDataApi.getSmartDevices(this._iModel);
        const cloudData: DeviceData = await DeviceStatusApi.getData();
        console.log(cloudData);

        devices.forEach((device) => {
            const smartDeviceMarker = new SmartDeviceMarker(
                { x: device.origin.x, y: device.origin.y, z: device.origin.z },
                { x: 40, y: 40 }, // Visual pixel size
                device.smartDeviceId,
                device.smartDeviceType,
                cloudData[device.smartDeviceId],
                device.id
            );
            this._markers.push(smartDeviceMarker);
        });
    }

    public decorate(context: DecorateContext): void {
        this._markers.forEach(marker => {
            marker.addDecoration(context);
        });
        console.log("SmartDevice decorate called");
    }
}
